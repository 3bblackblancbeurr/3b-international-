#pragma once

#include "CoreMinimal.h"
#include "AbilitySystemInterface.h"
#include "GameFramework/PlayerState.h"
#include "ThreeBPlayerState.generated.h"

class UAbilitySystemComponent;
class UThreeBAttributeSet;

UCLASS()
class THREEBWORLD_API AThreeBPlayerState : public APlayerState, public IAbilitySystemInterface
{
    GENERATED_BODY()

public:
    AThreeBPlayerState();

    virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;

    UFUNCTION(BlueprintPure, Category="3B|Ability")
    UThreeBAttributeSet* GetThreeBAttributes() const { return AttributeSet; }

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="3B|Ability")
    TObjectPtr<UAbilitySystemComponent> AbilitySystem;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="3B|Ability")
    TObjectPtr<UThreeBAttributeSet> AttributeSet;
};
