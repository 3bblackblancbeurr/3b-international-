#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ThreeBInteractionComponent.generated.h"

class AActor;
class AThreeBCharacter;

UCLASS(ClassGroup=(ThreeB), meta=(BlueprintSpawnableComponent))
class THREEBWORLD_API UThreeBInteractionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UThreeBInteractionComponent();

    UFUNCTION(BlueprintCallable, Category="3B|Interaction")
    void RequestInteract();

    UFUNCTION(BlueprintPure, Category="3B|Interaction")
    AActor* FindFocusedActor() const;

protected:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Interaction", meta=(ClampMin="150.0", ClampMax="450.0"))
    float InteractionDistance = 320.0f;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Interaction", meta=(ClampMin="-1.0", ClampMax="1.0"))
    float MinimumFacingDot = 0.25f;

private:
    UFUNCTION(Server, Reliable)
    void ServerInteract(AActor* Target);

    bool ValidateServerTarget(AActor* Target) const;
};
