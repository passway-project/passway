import { FastifyPluginAsync } from 'fastify'
import { Server } from '@tus/server'
import { S3Store } from '@tus/s3-store'

import { containerName } from '../../../constants'

export const routeName = 'upload'

export const uploadRoute: FastifyPluginAsync<{ prefix: string }> = async (
  app,
  options
) => {
  const s3Store = new S3Store({
    partSize: 8 * 1024 * 1024, // Each uploaded part will have ~8MiB,
    s3ClientConfig: {
      forcePathStyle: true,
      endpoint: `http://${containerName.CONTENT_STORE}:9000`,
      bucket: (process.env.MINIO_DEFAULT_BUCKETS ?? '').split(',')[0],
      region: process.env.MINIO_SERVER_REGION ?? '',
      credentials: {
        accessKeyId: process.env.MINIO_SERVER_ACCESS_KEY ?? '',
        secretAccessKey: process.env.MINIO_SERVER_SECRET_KEY ?? '',
      },
    },
  })

  const tusServer = new Server({
    generateUrl: (_request, { host, id, path, proto }) => {
      return `${proto}://${host}:${process.env.API_PORT}${path}/${id}`
    },
    path: `${options.prefix}/${routeName}`,
    datastore: s3Store,
    onUploadFinish: async (_request, response, upload) => {
      // FIXME: Create file metadata record
      app.log.info(upload, 'Upload complete')
      return response
    },
  })

  // NOTE: Needed for tus-node-server
  // https://github.com/tus/tus-node-server?tab=readme-ov-file#quick-start
  app.addContentTypeParser('application/offset+octet-stream', async () => null)

  app.all(`/${routeName}`, (req, res) => {
    tusServer.handle(req.raw, res.raw)
  })

  app.all(`/${routeName}/*`, (req, res) => {
    tusServer.handle(req.raw, res.raw)
  })
}
