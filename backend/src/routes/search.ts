// src/routes/search.ts
import { Router, Request, Response } from 'express';
import { searchPlaces, reverseGeocode } from '../services/searchService';
import { ApiResponse, SearchSuggestion } from '../types';

const router = Router();

router.get('/suggest', async (req: Request, res: Response) => {
  const { q, limit } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ success: false, error: 'Query parameter "q" is required', timestamp: Date.now() });
  }
  const results = await searchPlaces(q, limit ? parseInt(limit as string) : 8);
  const response: ApiResponse<SearchSuggestion[]> = { success: true, data: results, timestamp: Date.now() };
  return res.json(response);
});

router.get('/reverse', async (req: Request, res: Response) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ success: false, error: 'lat and lon are required', timestamp: Date.now() });
  }
  const result = await reverseGeocode(parseFloat(lat as string), parseFloat(lon as string));
  return res.json({ success: !!result, data: result, timestamp: Date.now() });
});

export default router;
