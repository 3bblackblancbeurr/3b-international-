#include "ThreeBCharacter.h"

#include "AbilitySystemComponent.h"
#include "Camera/CameraComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "ThreeBPlayerState.h"

AThreeBCharacter::AThreeBCharacter()
{
    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = false;
    bUseControllerRotationRoll = false;

    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0.0f, 540.0f, 0.0f);

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(GetRootComponent());
    CameraBoom->TargetArmLength = 340.0f;
    CameraBoom->bUsePawnControlRotation = true;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;
}

void AThreeBCharacter::BeginPlay()
{
    Super::BeginPlay();

    const APlayerController* PC = Cast<APlayerController>(Controller);
    if (!PC || !PC->IsLocalController() || !DefaultMappingContext)
    {
        return;
    }

    if (const ULocalPlayer* LocalPlayer = PC->GetLocalPlayer())
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem = LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
        {
            Subsystem->AddMappingContext(DefaultMappingContext, 0);
        }
    }
}

void AThreeBCharacter::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);
    InitAbilityActorInfo();
}

void AThreeBCharacter::OnRep_PlayerState()
{
    Super::OnRep_PlayerState();
    InitAbilityActorInfo();
}

void AThreeBCharacter::InitAbilityActorInfo()
{
    if (AThreeBPlayerState* PS = GetPlayerState<AThreeBPlayerState>())
    {
        if (UAbilitySystemComponent* ASC = PS->GetAbilitySystemComponent())
        {
            ASC->InitAbilityActorInfo(PS, this);
        }
    }
}

UAbilitySystemComponent* AThreeBCharacter::GetAbilitySystemComponent() const
{
    if (const AThreeBPlayerState* PS = GetPlayerState<AThreeBPlayerState>())
    {
        return PS->GetAbilitySystemComponent();
    }
    return nullptr;
}

void AThreeBCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    UEnhancedInputComponent* Enhanced = Cast<UEnhancedInputComponent>(PlayerInputComponent);
    if (!Enhanced)
    {
        return;
    }

    if (MoveAction)
    {
        Enhanced->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AThreeBCharacter::Move);
    }
    if (LookAction)
    {
        Enhanced->BindAction(LookAction, ETriggerEvent::Triggered, this, &AThreeBCharacter::Look);
    }
    if (JumpAction)
    {
        Enhanced->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump);
        Enhanced->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
    }
}

void AThreeBCharacter::Move(const FInputActionValue& Value)
{
    const FVector2D Axis = Value.Get<FVector2D>();
    if (!Controller)
    {
        return;
    }

    const FRotator ControlRotation = Controller->GetControlRotation();
    const FRotator YawRotation(0.0f, ControlRotation.Yaw, 0.0f);
    AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X), Axis.Y);
    AddMovementInput(FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y), Axis.X);
}

void AThreeBCharacter::Look(const FInputActionValue& Value)
{
    const FVector2D Axis = Value.Get<FVector2D>();
    AddControllerYawInput(Axis.X);
    AddControllerPitchInput(Axis.Y);
}
