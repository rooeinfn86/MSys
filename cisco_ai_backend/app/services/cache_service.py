from typing import Any, Optional
import asyncio
from datetime import datetime, timedelta
import json

class CacheService:
    def __init__(self):
        self._cache = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get a value from cache."""
        async with self._lock:
            if key in self._cache:
                item = self._cache[key]
                if datetime.utcnow() < item["expires"]:
                    return item["value"]
                else:
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set a value in cache with TTL."""
        async with self._lock:
            self._cache[key] = {
                "value": value,
                "expires": datetime.utcnow() + timedelta(seconds=ttl_seconds)
            }
    
    async def delete(self, key: str):
        """Delete a key from cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    async def clear(self):
        """Clear all cache."""
        async with self._lock:
            self._cache.clear()
    
    async def get_or_set(self, key: str, default_func, ttl_seconds: int = 300):
        """Get from cache or set default value if not exists."""
        value = await self.get(key)
        if value is None:
            value = default_func()
            await self.set(key, value, ttl_seconds)
        return value
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching a pattern."""
        async with self._lock:
            keys_to_delete = [key for key in self._cache.keys() if pattern in key]
            for key in keys_to_delete:
                del self._cache[key]
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        now = datetime.utcnow()
        total_keys = len(self._cache)
        expired_keys = sum(1 for item in self._cache.values() if now >= item["expires"])
        valid_keys = total_keys - expired_keys
        
        return {
            "total_keys": total_keys,
            "valid_keys": valid_keys,
            "expired_keys": expired_keys,
            "cache_size": len(str(self._cache))
        }

# Global cache instance
cache_service = CacheService() 