#!/bin/bash

# NOTE: This is meant to be run inside the content-store container.

while ! curl --silent --fail "http://127.0.0.1:9000/minio/health/live"
do
  echo "Waiting for MinIO to come online..."
  sleep 2s
done

mc admin user svcacct add --access-key $MINIO_SERVER_ACCESS_KEY --secret-key $MINIO_SERVER_SECRET_KEY local $MINIO_ROOT_USER
