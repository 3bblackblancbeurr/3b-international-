import {ArrowUpRight} from 'lucide-react';
import {Card} from '../design-system/index.jsx';

export default function CompactCard({as:Tag='button',title,eyebrow,description,icon,action='Ouvrir',className='',children,...props}){
 return <Card as={Tag} {...(Tag==='button'?{type:'button'}:{})} {...props} className={'compact-card '+className}>
  {icon&&<span className="compact-card-icon" aria-hidden="true">{icon}</span>}
  <span className="compact-card-copy">{eyebrow&&<small>{eyebrow}</small>}<strong>{title}</strong>{description&&<span>{description}</span>}{children}</span>
  <span className="compact-card-action">{action&&<span>{action}</span>}<ArrowUpRight size={17} aria-hidden="true"/></span>
 </Card>;
}
