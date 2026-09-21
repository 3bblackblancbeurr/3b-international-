import React from 'react';
import {BadgeCheck,Crown} from 'lucide-react';
import './OfficialIdentityBadge.css';

export default function OfficialIdentityBadge({profile,compact=false,className=''}) {
 if(!profile?.public_verified||!profile?.public_title)return null;
 return <span
  className={['official-identity-badge',compact?'is-compact':'',className].filter(Boolean).join(' ')}
  data-badge={profile.public_badge_key||'official'}
  title="Identité officielle 3B"
  aria-label={profile.public_title+' — identité officielle 3B'}
 >
  <Crown size={compact?11:13} aria-hidden="true"/>
  <strong>{profile.public_title}</strong>
  <BadgeCheck size={compact?12:14} aria-hidden="true"/>
 </span>;
}
