// src/routes/route.ts
import { Router, Request, Response } from 'express';
import { getRoute } from '../services/routingService';
import { RouteRequest, TravelMode, ApiResponse, RouteInfo } from '../types';

const router = Router();

router.post('/calculate', async (req: Request, res: Response) => {
  const { origin, destination, mode = 'driving' } = req.body as RouteRequest;

  if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
    return res.status(400).json({
      success: false,
      error: 'origin and destination coordinates are required',
      timestamp: Date.now(),
    });
  }

  const validModes: TravelMode[] = ['driving', 'walking', 'cycling'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ success: false, error: 'Invalid travel mode', timestamp: Date.now() });
  }

  const route = await getRoute({ origin, destination, mode });
  const response: ApiResponse<RouteInfo | null> = {
    success: !!route,
    data: route,
    error: route ? undefined : 'No route found',
    timestamp: Date.now(),
  };
  return res.status(route ? 200 : 404).json(response);
});

export default router;
