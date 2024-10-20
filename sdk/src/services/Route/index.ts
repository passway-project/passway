export enum Route {
  user = 'user',
  session = 'session',
  content = 'content',
  contentList = 'content/list',
  contentDownload = 'content/:contentId',
}

export class RouteService {
  root: string
  version: number

  constructor(root: string, version: number) {
    this.root = root
    this.version = version
  }

  resolve(route: Route, params?: Record<string, string>) {
    let resolvedRoute = String(route)

    if (params) {
      const paramEntries = Object.entries(params)

      for (const [paramName, paramValue] of paramEntries) {
        resolvedRoute = resolvedRoute.replace(`:${paramName}`, paramValue)
      }
    }

    return `${this.root}/v${this.version}/${resolvedRoute}`
  }
}
