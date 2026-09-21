#include "ThreeBPlayerState.h"

#include "AbilitySystemComponent.h"
#include "ThreeBAttributeSet.h"

AThreeBPlayerState::AThreeBPlayerState()
{
    NetUpdateFrequency = 60.0f;

    AbilitySystem = CreateDefaultSubobject<UAbilitySystemComponent>(TEXT("AbilitySystem"));
    AbilitySystem->SetIsReplicated(true);
    AbilitySystem->SetReplicationMode(EGameplayEffectReplicationMode::Mixed);

    AttributeSet = CreateDefaultSubobject<UThreeBAttributeSet>(TEXT("AttributeSet"));
}

UAbilitySystemComponent* AThreeBPlayerState::GetAbilitySystemComponent() const
{
    return AbilitySystem;
}
