import mongoose from 'mongoose';
import logger from './logger';

export const optimizeQuery = (query: mongoose.Query<any, any>) => {
  // Add query execution time logging
  const start = Date.now();
  
  query.setOptions({ 
    maxTimeMS: 5000, // 5 second timeout
    lean: true // Return plain objects instead of Mongoose documents
  });

  // Log slow queries
  query.then(() => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({
        type: 'SlowQuery',
        duration,
        query: query.getQuery(),
        collection: query.model.collection.name
      });
    }
  });

  return query;
}; 