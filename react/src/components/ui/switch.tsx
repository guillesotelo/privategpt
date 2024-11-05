import React, { useContext } from 'react'
import { AppContext } from '../../AppContext'

type Props = {
    label: string
    on?: string
    off?: string
    value?: boolean
    setValue: (value: boolean) => void
    style?: React.CSSProperties
}

export default function Switch({ label, on, off, value, setValue, style }: Props) {
    const { theme } = useContext(AppContext)
    
    return (
        <div
            className="switch__container"
            onClick={() => setValue(!value)}
            style={style}
        >
            {label ? <p className={`switch__label${theme}`}>{label}</p> : ''}
            <div
                className={`switch__row${theme}`}
                style={{
                    backgroundColor: value ? '#8cb688' : '',
                }}>
                <p className="switch__on">{on || 'On'}</p>
                <p className={`switch__slider${value ? '--on' : '--off'}`} ></p>
                <p className="switch__off" >{off || 'Off'}</p>
            </div>
        </div>
    )
}