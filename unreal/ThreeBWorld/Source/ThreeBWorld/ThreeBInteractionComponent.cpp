#include "ThreeBInteractionComponent.h"

#include "GameFramework/Actor.h"
#include "GameFramework/Character.h"
#include "GameFramework/Controller.h"
#include "ThreeBCharacter.h"
#include "ThreeBInteractable.h"

UThreeBInteractionComponent::UThreeBInteractionComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    SetIsReplicatedByDefault(true);
}

AActor* UThreeBInteractionComponent::FindFocusedActor() const
{
    const AThreeBCharacter* Character = Cast<AThreeBCharacter>(GetOwner());
    const AController* Controller = Character ? Character->GetController() : nullptr;
    if (!Character || !Controller)
    {
        return nullptr;
    }

    FVector ViewLocation;
    FRotator ViewRotation;
    Controller->GetPlayerViewPoint(ViewLocation, ViewRotation);

    const float SafeDistance = FMath::Clamp(InteractionDistance, 150.0f, 450.0f);
    const FVector End = ViewLocation + ViewRotation.Vector() * SafeDistance;

    FHitResult Hit;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ThreeBInteractionFocus), true, Character);
    if (!GetWorld()->LineTraceSingleByChannel(Hit, ViewLocation, End, ECC_Visibility, Params))
    {
        return nullptr;
    }

    AActor* Target = Hit.GetActor();
    return Target && Target->GetClass()->ImplementsInterface(UThreeBInteractable::StaticClass()) ? Target : nullptr;
}

void UThreeBInteractionComponent::RequestInteract()
{
    if (AActor* Target = FindFocusedActor())
    {
        ServerInteract(Target);
    }
}

void UThreeBInteractionComponent::ServerInteract_Implementation(AActor* Target)
{
    if (!ValidateServerTarget(Target))
    {
        return;
    }

    AThreeBCharacter* Character = Cast<AThreeBCharacter>(GetOwner());
    if (!Character || !IThreeBInteractable::Execute_CanInteract(Target, Character))
    {
        return;
    }

    IThreeBInteractable::Execute_AuthorizedInteract(Target, Character);
}

bool UThreeBInteractionComponent::ValidateServerTarget(AActor* Target) const
{
    const AThreeBCharacter* Character = Cast<AThreeBCharacter>(GetOwner());
    const AController* Controller = Character ? Character->GetController() : nullptr;
    if (!Character || !Character->HasAuthority() || !Controller || !IsValid(Target))
    {
        return false;
    }

    if (!Target->GetClass()->ImplementsInterface(UThreeBInteractable::StaticClass()))
    {
        return false;
    }

    const float SafeDistance = FMath::Clamp(InteractionDistance, 150.0f, 450.0f);
    const FVector CharacterLocation = Character->GetActorLocation();
    const FVector TargetLocation = Target->GetActorLocation();
    const FVector ToTarget = TargetLocation - CharacterLocation;

    if (ToTarget.SizeSquared() > FMath::Square(SafeDistance + 75.0f))
    {
        return false;
    }

    FVector ViewLocation;
    FRotator ViewRotation;
    Controller->GetPlayerViewPoint(ViewLocation, ViewRotation);
    const FVector Direction = (TargetLocation - ViewLocation).GetSafeNormal();
    if (FVector::DotProduct(ViewRotation.Vector(), Direction) < FMath::Clamp(MinimumFacingDot, -1.0f, 1.0f))
    {
        return false;
    }

    FHitResult Hit;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ThreeBInteractionServerValidation), true, Character);
    if (GetWorld()->LineTraceSingleByChannel(Hit, ViewLocation, TargetLocation, ECC_Visibility, Params))
    {
        AActor* HitActor = Hit.GetActor();
        if (HitActor && HitActor != Target && !HitActor->IsOwnedBy(Target))
        {
            return false;
        }
    }

    return true;
}
