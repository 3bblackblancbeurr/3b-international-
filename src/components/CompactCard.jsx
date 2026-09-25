import {ArrowUpRight,LockKeyhole} from 'lucide-react';
export default function CompactCard({as:Tag='button',title,eyebrow,description,icon,action='Ouvrir',className='',children,locked=false,...props}){
 const ActionIcon=locked?LockKeyhole:ArrowUpRight;
 return <Tag {...(Tag==='button'?{type:'button'}:{})} {...props} className={'compact-card '+(locked?'is-locked ':'')+className}>
  {icon&&<span className="compact-card-icon" aria-hidden="true">{icon}</span>}
  <span className="compact-card-copy">{eyebrow&&<small>{eyebrow}</small>}<strong>{title}</strong>{description&&<span>{description}</span>}{children}</span>
  <span className="compact-card-action">{action&&<span>{action}</span>}<ActionIcon size={17} aria-hidden="true"/></span>
 </Tag>;
}

