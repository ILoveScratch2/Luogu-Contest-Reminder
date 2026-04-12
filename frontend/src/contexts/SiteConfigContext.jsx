import React, { createContext, useContext, useEffect, useState } from 'react'
import { getSiteConfig } from '../api/index.js'

const DEFAULT_CONFIG = {
  site_title: 'Luogu Contest Reminder',
  primary_color: '#1976d2',
  favicon_url: '',
}

const SiteConfigContext = createContext({ config: DEFAULT_CONFIG, setConfig: () => {} })

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG)

  useEffect(() => {
    getSiteConfig()
      .then(({ data }) => { if (data) setConfig({ ...DEFAULT_CONFIG, ...data }) })
      .catch(() => {})
  }, [])

  // document.title
  useEffect(() => {
    document.title = config.site_title || DEFAULT_CONFIG.site_title
  }, [config.site_title])

  // favicon
  useEffect(() => {
    if (!config.favicon_url) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = config.favicon_url
  }, [config.favicon_url])

  return (
    <SiteConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfig() {
  return useContext(SiteConfigContext)
}
