#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ThreeBInteractable.h"
#include "ThreeBExplorationPortal.generated.h"

class UStaticMeshComponent;
class UTextRenderComponent;

/** Native exploration transport. It cannot grant account rewards or story completion. */
UCLASS()
class THREEBWORLD_API AThreeBExplorationPortal : public AActor, public IThreeBInteractable
{
    GENERATED_BODY()
public:
    AThreeBExplorationPortal();
    virtual void OnConstruction(const FTransform& Transform) override;
    virtual bool CanInteract_Implementation(AThreeBCharacter* Interactor) override;
    virtual void AuthorizedInteract_Implementation(AThreeBCharacter* Interactor) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="3B|Exploration")
    FName DestinationMap;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="3B|Exploration")
    FString PortalLabel = TEXT("E - Voyager");
private:
    UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Marker;
    UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Label;
};
