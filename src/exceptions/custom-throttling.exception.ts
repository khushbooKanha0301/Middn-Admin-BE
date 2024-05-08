import { Catch, ArgumentsHost, HttpStatus } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";

// Custom exception filter to handle ThrottlerException
@Catch(ThrottlerException)
export class CustomThrottlingExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest();
    const userId = req.headers?.address?.toString();
    const windowSeconds = 55;
    const now = Date.now();
    const requestCount = req.app.locals.throttleCounter || {};
   
    // Initialize request count for the user and URL if not already present
    if (!requestCount[userId]) {
      requestCount[userId] = {};
    }
    if (!requestCount[userId][req.originalUrl]) {
      requestCount[userId][req.originalUrl] = {};
    }

    // Set the time when the next request can be made
    requestCount[userId][req.originalUrl]["time"] = now + windowSeconds * 1000;
    req.app.locals.throttleCounter = requestCount;

    const response = host.switchToHttp().getResponse();
    const message = "Too Many Requests. Please Try after sometimes";

    // Return response with status code 429 (Too Many Requests)
    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: message,
    });
  }
}
