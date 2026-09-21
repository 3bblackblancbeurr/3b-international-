#include "ThreeBAttributeSet.h"

#include "GameplayEffectExtension.h"
#include "Net/UnrealNetwork.h"

UThreeBAttributeSet::UThreeBAttributeSet()
{
    InitMaxHealth(100.0f);
    InitHealth(100.0f);
    InitMaxStamina(100.0f);
    InitStamina(100.0f);
    InitMaxFocus(100.0f);
    InitFocus(50.0f);
    InitMaxResonance(100.0f);
    InitResonance(0.0f);
}

void UThreeBAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);

    if (Data.EvaluatedData.Attribute == GetHealthAttribute())
    {
        SetHealth(FMath::Clamp(GetHealth(), 0.0f, GetMaxHealth()));
    }
    else if (Data.EvaluatedData.Attribute == GetStaminaAttribute())
    {
        SetStamina(FMath::Clamp(GetStamina(), 0.0f, GetMaxStamina()));
    }
    else if (Data.EvaluatedData.Attribute == GetFocusAttribute())
    {
        SetFocus(FMath::Clamp(GetFocus(), 0.0f, GetMaxFocus()));
    }
    else if (Data.EvaluatedData.Attribute == GetResonanceAttribute())
    {
        SetResonance(FMath::Clamp(GetResonance(), 0.0f, GetMaxResonance()));
    }
}

void UThreeBAttributeSet::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, Health, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, MaxHealth, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, Stamina, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, MaxStamina, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, Focus, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, MaxFocus, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, Resonance, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UThreeBAttributeSet, MaxResonance, COND_None, REPNOTIFY_Always);
}

void UThreeBAttributeSet::OnRep_Health(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, Health, OldValue); }
void UThreeBAttributeSet::OnRep_MaxHealth(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, MaxHealth, OldValue); }
void UThreeBAttributeSet::OnRep_Stamina(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, Stamina, OldValue); }
void UThreeBAttributeSet::OnRep_MaxStamina(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, MaxStamina, OldValue); }
void UThreeBAttributeSet::OnRep_Focus(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, Focus, OldValue); }
void UThreeBAttributeSet::OnRep_MaxFocus(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, MaxFocus, OldValue); }
void UThreeBAttributeSet::OnRep_Resonance(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, Resonance, OldValue); }
void UThreeBAttributeSet::OnRep_MaxResonance(const FGameplayAttributeData& OldValue) { GAMEPLAYATTRIBUTE_REPNOTIFY(UThreeBAttributeSet, MaxResonance, OldValue); }
