import type { NextApiRequest, NextApiResponse } from 'next';
import { processRentData } from '../../lib/rent-data-processor';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const rentData = processRentData();
    res.status(200).json(rentData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Error processing rent data', error: errorMessage });
  }
}
