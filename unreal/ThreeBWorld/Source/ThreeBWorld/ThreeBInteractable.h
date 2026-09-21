#pragma once

#include "CoreMinimal.h"
#include "GameplayTagContainer.h"
#include "UObject/Interface.h"
#include "ThreeBInteractable.generated.h"

class AThreeBCharacter;

UINTERFACE(BlueprintType)
class THREEBWORLD_API UThreeBInteractable : public UInterface
{
    GENERATED_BODY()
};

class THREEBWORLD_API IThreeBInteractable
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category="3B|Interaction")
    bool CanInteract(AThreeBCharacter* Interactor);

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category="3B|Interaction")
    FGameplayTag GetInteractionTag();

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, BlueprintAuthorityOnly, Category="3B|Interaction")
    void AuthorizedInteract(AThreeBCharacter* Interactor);
};
