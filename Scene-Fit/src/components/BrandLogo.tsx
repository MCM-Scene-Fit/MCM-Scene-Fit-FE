import { Link } from 'react-router-dom'
import logoC from '../assets/brand/logo-c.png'
import logoFit from '../assets/brand/logo-fit.png'
import logoMcm from '../assets/brand/logo-mcm.png'
import logoScene from '../assets/brand/logo-scene.png'

type BrandLogoProps = {
  compact?: boolean
  to?: string | null
  className?: string
  showMcm?: boolean
}

function LockupMark({ compact, showMcm }: { compact?: boolean; showMcm: boolean }) {
  return (
    <span
      className={`brand-lockup${compact ? ' is-compact' : ''}${showMcm ? '' : ' is-scene-fit'}`}
      aria-label={showMcm ? 'MCM SCENE FIT' : 'SCENE FIT'}
    >
      {showMcm ? <img src={logoMcm} alt="" className="brand-lockup__part" /> : null}
      <span className="brand-lockup__scene">
        <img src={logoScene} alt="" className="brand-lockup__part" />
        <img src={logoC} alt="" className="brand-lockup__c-img" />
      </span>
      <img src={logoFit} alt="" className="brand-lockup__part" />
    </span>
  )
}

export function BrandLogo({
  compact = false,
  to = '/',
  className = '',
  showMcm = true,
}: BrandLogoProps) {
  const mark = <LockupMark compact={compact} showMcm={showMcm} />

  if (!to) return mark

  return (
    <Link to={to} className={`brand-logo-link${className ? ` ${className}` : ''}`} aria-label="홈으로">
      {mark}
    </Link>
  )
}
