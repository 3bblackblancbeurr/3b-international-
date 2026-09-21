import React from 'react';
import {BadgeCheck,Crown} from 'lucide-react';
import './public-identity.css';

export function isOfficialIdentity(profile){
 return !!(profile?.public_verified&&profile?.public_badge_key&&profile?.public_title);
}

export default function PublicIdentityBadge({profile,compact=false,className=''}) {
 if(!isOfficialIdentity(profile))return null;
 const founder=profile.public_badge_key==='director_founder';
 return <span
  className={['public-identity-badge',founder?'director-founder':'official',compact?'compact':'',className].filter(Boolean).join(' ')}
  title={profile.public_title}
  aria-label={profile.public_title}
 >
  {founder?<Crown size={compact?11:13}/>:<BadgeCheck size={compact?11:13}/>}
  <strong>{profile.public_title}</strong>
  <BadgeCheck className="public-identity-check" size={compact?11:13} aria-hidden="true"/>
 </span>;
}
