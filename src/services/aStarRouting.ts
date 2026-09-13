import { AStarPathResult, RiskLevel, RouteEdge, RouteNode } from '../types';

interface AStarNodeRecord {
  nodeId: string;
  gScore: number;
  fScore: number;
  parent: string | null;
  edgeUsed: RouteEdge | null;
}

export function calculateEuclideanDistance(n1: RouteNode, n2: RouteNode): number {
  const dx = n1.x - n2.x;
  const dy = n1.y - n2.y;
  // Scaled schematic map: 100x92 units corresponds roughly to 30km regional span
  return Math.sqrt(dx * dx + dy * dy) * 0.3;
}

export function findAStarEmergencyRoute(
  startNodeId: string,
  targetNodeId: string,
  allNodes: RouteNode[],
  allEdges: RouteEdge[],
  zoneRiskMap: Record<string, RiskLevel> = {},
  blockedEdgeKeys: Set<string> = new Set()
): AStarPathResult {
  const nodeMap = new Map<string, RouteNode>();
  allNodes.forEach((n) => nodeMap.set(n.id, n));

  const startNode = nodeMap.get(startNodeId);
  const targetNode = nodeMap.get(targetNodeId);

  if (!startNode || !targetNode) {
    return {
      nodes: [],
      edges: [],
      totalDistanceKm: 0,
      estimatedTimeMin: 0,
      overallRisk: 'Low',
      pathFound: false,
      hazardWarnings: ['Start or target node does not exist in the routing graph.'],
      avoidedCount: 0
    };
  }

  // Build adjacency list (undirected hilly road network)
  const adj = new Map<string, { neighborId: string; edge: RouteEdge }[]>();
  for (const n of allNodes) {
    adj.set(n.id, []);
  }

  for (const edge of allEdges) {
    adj.get(edge.from)?.push({ neighborId: edge.to, edge });
    adj.get(edge.to)?.push({
      neighborId: edge.from,
      edge: { ...edge, from: edge.to, to: edge.from }
    });
  }

  // Priority set / maps
  const openSet = new Set<string>([startNodeId]);
  const closedSet = new Set<string>();

  const records = new Map<string, AStarNodeRecord>();
  records.set(startNodeId, {
    nodeId: startNodeId,
    gScore: 0,
    fScore: calculateEuclideanDistance(startNode, targetNode),
    parent: null,
    edgeUsed: null
  });

  const hazardWarnings: string[] = [];
  let avoidedCount = 0;

  while (openSet.size > 0) {
    // Pick node in openSet with lowest fScore
    let currentId: string | null = null;
    let lowestF = Infinity;

    for (const id of openSet) {
      const rec = records.get(id);
      if (rec && rec.fScore < lowestF) {
        lowestF = rec.fScore;
        currentId = id;
      }
    }

    if (!currentId) break;

    // Target reached!
    if (currentId === targetNodeId) {
      // Reconstruct path
      const pathNodes: RouteNode[] = [];
      const pathEdges: RouteEdge[] = [];
      let curr: string | null = targetNodeId;

      while (curr) {
        const n = nodeMap.get(curr);
        if (n) pathNodes.unshift(n);
        const rec = records.get(curr);
        if (rec?.edgeUsed) {
          pathEdges.unshift(rec.edgeUsed);
        }
        curr = rec?.parent ?? null;
      }

      // Compute stats
      let totalDist = 0;
      let totalMinutes = 0;
      let highestRiskLevel: RiskLevel = 'Low';

      for (const e of pathEdges) {
        totalDist += e.distanceKm;
        // Base hill speed ~ 28 km/h. Steep slope reduces speed.
        const effectiveSpeedKmH = Math.max(10, 28 - (e.slopePct * 0.3));
        const travelMin = (e.distanceKm / effectiveSpeedKmH) * 60;
        totalMinutes += travelMin;

        // Check zone risk
        const fromNode = nodeMap.get(e.from);
        const toNode = nodeMap.get(e.to);
        const zoneFrom = fromNode?.zoneId ? zoneRiskMap[fromNode.zoneId] : 'Low';
        const zoneTo = toNode?.zoneId ? zoneRiskMap[toNode.zoneId] : 'Low';

        if (zoneFrom === 'Critical' || zoneTo === 'Critical') {
          highestRiskLevel = 'Critical';
        } else if ((zoneFrom === 'High' || zoneTo === 'High') && highestRiskLevel !== 'Critical') {
          highestRiskLevel = 'High';
        } else if ((zoneFrom === 'Moderate' || zoneTo === 'Moderate') && highestRiskLevel === 'Low') {
          highestRiskLevel = 'Moderate';
        }
      }

      return {
        nodes: pathNodes,
        edges: pathEdges,
        totalDistanceKm: Math.round(totalDist * 10) / 10,
        estimatedTimeMin: Math.max(4, Math.round(totalMinutes)),
        overallRisk: highestRiskLevel,
        pathFound: true,
        hazardWarnings,
        avoidedCount
      };
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    const currentNode = nodeMap.get(currentId)!;
    const currentRec = records.get(currentId)!;
    const neighbors = adj.get(currentId) || [];

    for (const { neighborId, edge } of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;

      const edgeKey1 = `${edge.from}->${edge.to}`;
      const edgeKey2 = `${edge.to}->${edge.from}`;

      // Check if blocked by manual authority road block
      if (edge.blocked || blockedEdgeKeys.has(edgeKey1) || blockedEdgeKeys.has(edgeKey2)) {
        avoidedCount++;
        hazardWarnings.push(`Blocked sector avoided: ${currentNode.name} ↔ ${neighborNode.name} (${edge.blockReason || 'Road blocked/debris'})`);
        continue;
      }

      // Check flood risk of the target zone
      const neighborZoneRisk = neighborNode.zoneId ? zoneRiskMap[neighborNode.zoneId] || 'Low' : 'Low';
      
      // If critical flood risk and edge is adjacent to river or a suspension bridge, penalize heavily or bypass if alternative exists
      let riskCostMultiplier = 1.0;
      if (neighborZoneRisk === 'Critical') {
        if (edge.isBridge || edge.isRiverAdjacent) {
          // If bridge in critical flood zone, treat as high penalty avoidance
          riskCostMultiplier = 5.0;
          hazardWarnings.push(`High risk caution: Crossing ${neighborNode.name} near river during ${neighborZoneRisk} surge.`);
        } else {
          riskCostMultiplier = 2.5;
        }
      } else if (neighborZoneRisk === 'High') {
        riskCostMultiplier = 1.6;
      }

      // Elevation incline penalty: climbing uphill in hilly terrain increases effort
      const elevationDelta = Math.max(0, neighborNode.elevationM - currentNode.elevationM);
      const elevationCost = (elevationDelta / 1000) * 0.8;

      // Traversal cost
      const edgeCost = (edge.distanceKm * (1 + (edge.slopePct / 100) * 0.4) + elevationCost) * riskCostMultiplier;
      const tentativeG = currentRec.gScore + edgeCost;

      const existingNeighborRec = records.get(neighborId);
      if (!existingNeighborRec || tentativeG < existingNeighborRec.gScore) {
        const hScore = calculateEuclideanDistance(neighborNode, targetNode);
        records.set(neighborId, {
          nodeId: neighborId,
          gScore: tentativeG,
          fScore: tentativeG + hScore,
          parent: currentId,
          edgeUsed: edge
        });

        if (!openSet.has(neighborId)) {
          openSet.add(neighborId);
        }
      }
    }
  }

  return {
    nodes: [],
    edges: [],
    totalDistanceKm: 0,
    estimatedTimeMin: 0,
    overallRisk: 'Critical',
    pathFound: false,
    hazardWarnings: ['No accessible emergency route found due to terrain blockages or flood risk restrictions.'],
    avoidedCount
  };
}
