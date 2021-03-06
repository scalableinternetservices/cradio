import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache } from '@apollo/client'
import { SchemaLink } from '@apollo/client/link/schema'
import { getDataFromTree } from '@apollo/client/react/ssr'
import { isRedirect, ServerLocation } from '@reach/router'
import 'cross-fetch/polyfill' // enables fetch in node
import { Request, Response } from 'express'
import * as React from 'react'
import * as ReactDOMServer from 'react-dom/server'
import { Provider as StyletronProvider } from 'styletron-react'
import { App } from '../../web/src/view/App'
import { Config } from './config'

const Styletron = require('styletron-engine-monolithic')

function isomorphicLink(req: Request, schema: any) {
  if (typeof window === 'undefined') {
    // server side render
    return new SchemaLink({ schema })
  } else {
    // client side render
    return new HttpLink({
      uri: `http://127.0.0.1:${Config.appserverPort}/graphql`,
      credentials: 'same-origin',
      fetch: async (uri: any, options: any) => {
        const reqBody = JSON.parse(options!.body! as string)
        const opName = reqBody.operationName
        const actionName = reqBody.variables?.action?.actionName
        const authToken = req.cookies.authToken
        const headers = authToken ? { ...options.headers, 'x-authtoken': authToken } : options.headers
        return fetch(`${uri}?opName=${opName}${actionName ? `&actionName=${actionName}` : ''}`, {
          ...options,
          headers,
        })
      },
    })
  }
}

export function renderApp(req: Request, res: Response, schema: any) {
  const apolloClient = new ApolloClient({
    ssrMode: true,
    link: isomorphicLink(req, schema),
    cache: new InMemoryCache(),
  })

  const engine = new Styletron.Server()
  const app = (
    <ApolloProvider client={apolloClient}>
      <ServerLocation url={req.url}>
        <StyletronProvider value={engine}>
          <App />
        </StyletronProvider>
      </ServerLocation>
    </ApolloProvider>
  )

  getDataFromTree(app)
    .then(() => {
      const apolloState = apolloClient.extract()
      const body = ReactDOMServer.renderToString(app)
      const styles = engine.getCss()
      const html = ReactDOMServer.renderToString(
        <html>
          <head>
            <meta charSet="utf8" />
            <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="shortcut icon" href={`/app/assets/favicon${Config.isProd ? '' : '-dev'}.ico`} />
            <link rel="stylesheet" href="https://unpkg.com/tachyons@4.12.0/css/tachyons.min.css" />
            <link rel="stylesheet" href="/app/css/app.css" />
            <link
              rel="stylesheet"
              href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css"
              integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk"
              crossOrigin="anonymous"
            />
            <script src="https://unpkg.com/react/umd/react.production.min.js" crossOrigin="true"></script>

            <script src="https://unpkg.com/react-dom/umd/react-dom.production.min.js" crossOrigin="true"></script>

            <script
              src="https://unpkg.com/react-bootstrap@next/dist/react-bootstrap.min.js"
              crossOrigin="true"
            ></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `window.app = {
                  serverRendered: true,
                  wsUrl: "${Config.wsUrl}",
                  commitHash: "${'hash'}",
                  isProd: ${Config.isProd},
                  apolloState: ${apolloState ? JSON.stringify(apolloState) : 'undefined'}
                }`,
              }}
            />
            <style
              dangerouslySetInnerHTML={{
                __html: styles,
              }}
            />
          </head>
          <body>
            <div id="app" dangerouslySetInnerHTML={{ __html: body }} />
            <script src="/app/js/bundle.js"></script>
          </body>
        </html>
      )

      res.status(200).contentType('text/html').send(html)
    })
    .catch(err => {
      if (isRedirect(err)) {
        return res.redirect(err.uri)
      } else {
        return res.status(500).send(err.stack || err.message)
      }
    })
}

export const staticHtml = `<html lang="en">
  <head>
    <meta charset="utf8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="shortcut icon" href="/app/assets/favicon${Config.isProd ? '' : '-dev'}.ico">
    <link rel="stylesheet" href="https://unpkg.com/tachyons@4.12.0/css/tachyons.min.css" />
    <link rel="stylesheet" href="/app/css/app.css" >
    <link rel="stylesheet" href="https://"https://maxcdn.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous"/>
    <script>
      window.app = {
        serverRendered: false,
        wsUrl: "${Config.wsUrl}",
        commitHash: "${'hash'}",
        isProd: ${Config.isProd}
      }
    </script>
  </head>
  <body>
    <div id="app" />
    <div id="modal" />
    <script src="/app/js/bundle.js"></script>
  </body>
</html>`
