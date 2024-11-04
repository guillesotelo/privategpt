export type dataObj<T = any> = Record<string | number, T>

export type AppContextType = {
    isMobile: boolean
    darkMode: boolean
    setDarkMode: (value: boolean) => void
}