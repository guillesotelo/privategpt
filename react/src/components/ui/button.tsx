import { AppContext } from "@/AppContext"
import { useContext } from "react"

type Props = {
  label?: string
  onClick?: any
  className?: string
  style?: React.CSSProperties
}

export const Button = ({ label, onClick, className, style }: Props) => {
  const { theme } = useContext(AppContext)
  return (
    <button onClick={onClick} style={style} className={`button__default${theme} ${className || ''}`}>{label}</button>
  )
}