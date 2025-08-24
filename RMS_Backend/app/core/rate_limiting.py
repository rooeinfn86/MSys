from fastapi import Request, HTTPException
from typing import Dict, Tuple
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = defaultdict(list)
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed for the client."""
        now = time.time()
        
        # Remove old requests (older than 1 minute)
        self.requests[client_id] = [req_time for req_time in self.requests[client_id] 
                                  if now - req_time < 60]
        
        # Check if client has exceeded rate limit
        if len(self.requests[client_id]) >= self.requests_per_minute:
            return False
        
        # Add current request
        self.requests[client_id].append(now)
        return True
    
    def get_remaining_requests(self, client_id: str) -> int:
        """Get remaining requests for a client."""
        now = time.time()
        
        # Remove old requests
        self.requests[client_id] = [req_time for req_time in self.requests[client_id] 
                                  if now - req_time < 60]
        
        return max(0, self.requests_per_minute - len(self.requests[client_id]))
    
    def get_reset_time(self, client_id: str) -> float:
        """Get time until rate limit resets for a client."""
        if not self.requests[client_id]:
            return 0
        
        # Find the oldest request
        oldest_request = min(self.requests[client_id])
        return max(0, 60 - (time.time() - oldest_request))

class RateLimitMiddleware:
    def __init__(self, requests_per_minute: int = 60):
        self.rate_limiter = RateLimiter(requests_per_minute)
    
    async def __call__(self, request: Request, call_next):
        """Rate limiting middleware."""
        # Get client identifier (IP address or user ID)
        client_id = self._get_client_id(request)
        
        # Check rate limit
        if not self.rate_limiter.is_allowed(client_id):
            remaining_time = self.rate_limiter.get_reset_time(client_id)
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Try again in {int(remaining_time)} seconds.",
                    "retry_after": int(remaining_time)
                }
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limiter.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(self.rate_limiter.get_remaining_requests(client_id))
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self.rate_limiter.get_reset_time(client_id)))
        
        return response
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request."""
        # Try to get user ID from authenticated user
        if hasattr(request.state, 'user') and request.state.user:
            return f"user_{request.state.user.get('user_id', 'unknown')}"
        
        # Fallback to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip_{client_ip}"

# Global rate limiter instance
rate_limiter = RateLimiter()
rate_limit_middleware = RateLimitMiddleware() 