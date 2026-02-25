---
title: Pin Redis Docker Tags for Reproducible Deployments
impact: MEDIUM
impactDescription: Prevents surprise upgrades and configuration drift
tags: docker, tags, images, reproducibility, deployment
---

## Pin Redis Docker Tags for Reproducible Deployments

Avoid floating tags like `latest` or bare major tags in production. Pin to a specific patch version for repeatable builds, or pin to a minor version only if you explicitly want automatic patch updates.

**Correct:** Pin to a patch tag (preferred) or a minor tag (if you want patch updates).

```bash
# Preferred: exact patch
redis:8.4.0

# Acceptable for auto patch updates (use with caution)
redis:8.4
```

**Incorrect:** Use floating tags that can change without notice.

```bash
redis:latest
redis:8
```

Reference: [Redis Docker official image](https://hub.docker.com/_/redis), [Redis Docker tags](https://hub.docker.com/_/redis/tags)
