import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class CustomThrottleMiddleware implements NestMiddleware {
    async use(req: Request, res: Response, next: () => void) {
        // Get the user ID from the request headers
        const userId = req.headers?.address?.toString();
        
        // Get the current timestamp
        const now = Date.now();
        
        // Retrieve the throttle counter from the application locals
        const requestCount = req.app.locals.throttleCounter || {};
        
        // Initialize the request count for the current user if it doesn't exist
        if (!requestCount[userId]) {
            requestCount[userId] = {};
        }
        
        // Initialize the request count for the current URL if it doesn't exist
        if (!requestCount[userId][req.originalUrl]) {
            requestCount[userId][req.originalUrl] = {};
        }
        
        // Check if the current URL has a future time set in the throttle counter
        if (requestCount[userId][req.originalUrl]?.time) {
            // Retrieve the future time from the throttle counter and convert it to milliseconds
            let futureTime = parseInt(requestCount[userId][req.originalUrl].time);
            
            // If the current time is less than or equal to the future time,
            // it means the user has exceeded the throttle limit
            if (now <= futureTime) {
                return res
                    .status(HttpStatus.TOO_MANY_REQUESTS)
                    .json({
                        statusCode: HttpStatus.TOO_MANY_REQUESTS,
                        message: "Too Many Requests. Please Try after sometimes"
                    });
            } else {
                // If the current time is greater than the future time,
                // remove the throttle limit for the current URL
                delete requestCount[userId][req.originalUrl];
                req.app.locals.throttleCounter = requestCount;
            }
        }
        
        // Proceed to the next middleware or route handler
        next(); 
    }
}
