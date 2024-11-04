"use client";

import React, { createContext, useEffect, useState } from 'react'
import { AppContextType } from './types';

export const AppContext = createContext<AppContextType>({
    isMobile: false,
    theme: '',
    setTheme: () => { },
})

type Props = {
    children?: React.ReactNode
}

export const AppProvider = ({ children }: Props) => {
    const [isMobile, setIsMobile] = useState<boolean>(false)
    const [theme, setTheme] = useState('')
    const [windowLoading, setWindowLoading] = useState(true)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowLoading(false)
        }
        setTheme(JSON.parse(localStorage.getItem('preferredMode') || 'false') ? '--dark' : '')
        setIsMobile(isMobileDevice())

        getPreferredScheme()

        const checkWidth = () => setIsMobile(window.innerWidth <= 768)

        window.addEventListener("resize", checkWidth)
        return () => window.removeEventListener("resize", checkWidth)
    }, [])

    useEffect(() => {
        const body = document.querySelector('body')
        if (body) {
            body.classList.remove('--dark')
            if (theme) body.classList.add('--dark')

            document.documentElement.setAttribute(
                "data-color-scheme",
                theme ? "dark" : "light"
            )
        }
        localStorage.setItem('preferredMode', JSON.stringify(theme ? true : false))
    }, [theme])

    const isMobileDevice = () => {
        if (typeof window === 'undefined') return false // Server-side check

        const width = window.innerWidth
        const userAgent = window.navigator.userAgent.toLowerCase()

        const mobileKeywords = [
            'android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'
        ]

        const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword))
        const isSmallScreen = width <= 768

        return isMobile || isSmallScreen
    }

    const getPreferredScheme = () => {
        const savedMode = localStorage.getItem('preferredMode')
        const mode = JSON.parse(localStorage.getItem('preferredMode') || 'false') ? '--dark' : ''
        setTheme(savedMode ? mode : window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ? '--dark' : '')
    }

    const contextValue = React.useMemo(() => ({
        isMobile,
        theme,
        setTheme,
    }), [
        isMobile,
        theme,
        setTheme,
    ])


    return windowLoading ? null : <AppContext.Provider value={contextValue}>
        {children}
    </AppContext.Provider>
}