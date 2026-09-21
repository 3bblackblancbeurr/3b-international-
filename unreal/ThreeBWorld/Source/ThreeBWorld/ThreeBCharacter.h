#pragma once

#include "CoreMinimal.h"
#include "AbilitySystemInterface.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "ThreeBCharacter.generated.h"

class UAbilitySystemComponent;
class UCameraComponent;
class UInputAction;
class UInputMappingContext;
class USpringArmComponent;
class UThreeBInteractionComponent;

UCLASS()
class THREEBWORLD_API AThreeBCharacter : public ACharacter, public IAbilitySystemInterface
{
    GENERATED_BODY()

public:
    AThreeBCharacter();

    virtual void PossessedBy(AController* NewController) override;
    virtual void OnRep_PlayerState() override;
    virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="3B|Camera")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="3B|Camera")
    TObjectPtr<UCameraComponent> FollowCamera;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Input")
    TObjectPtr<UInputMappingContext> DefaultMappingContext;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Input")
    TObjectPtr<UInputAction> LookAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Input")
    TObjectPtr<UInputAction> JumpAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Input")
    TObjectPtr<UInputAction> SprintAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Input")
    TObjectPtr<UInputAction> InteractAction;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="3B|Interaction")
    TObjectPtr<UThreeBInteractionComponent> InteractionComponent;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Movement", meta=(ClampMin="150.0", ClampMax="650.0"))
    float WalkSpeed = 500.0f;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category="3B|Movement", meta=(ClampMin="500.0", ClampMax="850.0"))
    float SprintSpeed = 720.0f;

private:
    bool bSprintRequested = false;

    void InitAbilityActorInfo();
    void Move(const FInputActionValue& Value);
    void Look(const FInputActionValue& Value);
    void StartSprint();
    void StopSprint();
    void RequestInteraction();
    void SetSprintRequested(bool bRequested);
    void ApplySprintState();

    UFUNCTION(Server, Reliable)
    void ServerSetSprintRequested(bool bRequested);
};
