/**
 * Feature: Multi-Factor A* Emergency Evacuation Routing
 * 
 * Pathfinding incorporating distance, slope gradient penalties, water surge velocity,
 * and road blockage avoidance to compute safe egress paths to high-ground shelters.
 */

export { AStarRoutingView } from '../../components/AStarRoutingView';
export { findAStarEmergencyRoute } from '../../services/aStarRouting';
