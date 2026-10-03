#include "ThreeBExplorationPortal.h"
#include "ThreeBCharacter.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/PackageName.h"
#include "UObject/ConstructorHelpers.h"

AThreeBExplorationPortal::AThreeBExplorationPortal()
{
    Marker = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PortalMarker"));
    SetRootComponent(Marker);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Mesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    Marker->SetStaticMesh(Mesh.Object);
    Marker->SetRelativeScale3D(FVector(1.f, 1.f, 2.f));
    Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("PortalLabel"));
    Label->SetupAttachment(Marker);
    Label->SetRelativeLocation(FVector(0.f, 0.f, 100.f));
    Label->SetHorizontalAlignment(EHTA_Center);
    Label->SetWorldSize(22.f);
    Label->SetTextRenderColor(FColor(255, 217, 135));
}

void AThreeBExplorationPortal::OnConstruction(const FTransform& Transform)
{
    Super::OnConstruction(Transform);
    Label->SetText(FText::FromString(PortalLabel));
}

bool AThreeBExplorationPortal::CanInteract_Implementation(AThreeBCharacter* Interactor)
{
    return Interactor && GetNetMode() == NM_Standalone && !DestinationMap.IsNone()
        && FPackageName::DoesPackageExist(DestinationMap.ToString());
}

void AThreeBExplorationPortal::AuthorizedInteract_Implementation(AThreeBCharacter* Interactor)
{
    if (HasAuthority() && CanInteract_Implementation(Interactor))
    {
        UE_LOG(LogTemp, Display, TEXT("3B exploration travel: %s"), *DestinationMap.ToString());
        UGameplayStatics::OpenLevel(this, DestinationMap);
    }
}
