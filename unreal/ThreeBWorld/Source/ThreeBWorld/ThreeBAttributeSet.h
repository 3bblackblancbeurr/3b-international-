#pragma once

#include "CoreMinimal.h"
#include "AttributeSet.h"
#include "AbilitySystemComponent.h"
#include "ThreeBAttributeSet.generated.h"

#define THREEB_ATTRIBUTE_ACCESSORS(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)

UCLASS()
class THREEBWORLD_API UThreeBAttributeSet : public UAttributeSet
{
    GENERATED_BODY()

public:
    UThreeBAttributeSet();

    virtual void PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_Health, Category="3B|Vitals")
    FGameplayAttributeData Health;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, Health)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_MaxHealth, Category="3B|Vitals")
    FGameplayAttributeData MaxHealth;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, MaxHealth)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_Stamina, Category="3B|Vitals")
    FGameplayAttributeData Stamina;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, Stamina)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_MaxStamina, Category="3B|Vitals")
    FGameplayAttributeData MaxStamina;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, MaxStamina)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_Focus, Category="3B|Resonance")
    FGameplayAttributeData Focus;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, Focus)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_MaxFocus, Category="3B|Resonance")
    FGameplayAttributeData MaxFocus;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, MaxFocus)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_Resonance, Category="3B|Resonance")
    FGameplayAttributeData Resonance;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, Resonance)

    UPROPERTY(BlueprintReadOnly, ReplicatedUsing=OnRep_MaxResonance, Category="3B|Resonance")
    FGameplayAttributeData MaxResonance;
    THREEB_ATTRIBUTE_ACCESSORS(UThreeBAttributeSet, MaxResonance)

protected:
    UFUNCTION() void OnRep_Health(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxHealth(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_Stamina(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxStamina(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_Focus(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxFocus(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_Resonance(const FGameplayAttributeData& OldValue);
    UFUNCTION() void OnRep_MaxResonance(const FGameplayAttributeData& OldValue);
};
