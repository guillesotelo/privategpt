type Props = {
  label?: string
  onClick?: any
  className?: string
  style?: React.CSSProperties
}

export const Button = ({ label, onClick, className, style }: Props) => {
  return (
    <button onClick={onClick} style={style} className={`button__default ${className || ''}`}>{label}</button>
  )
}