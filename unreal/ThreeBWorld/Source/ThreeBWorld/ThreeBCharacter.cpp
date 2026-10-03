#include "ThreeBCharacter.h"

#include "AbilitySystemComponent.h"
#include "Camera/CameraComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "ThreeBPlayerState.h"
#include "ThreeBInteractionComponent.h"
#include "Components/StaticMeshComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/PlayerStart.h"

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

    InteractionComponent = CreateDefaultSubobject<UThreeBInteractionComponent>(TEXT("InteractionComponent"));

    // Explicit prototype silhouette until the authored skeletal character is delivered.
    UStaticMeshComponent* Silhouette = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PrototypeSilhouette"));
    Silhouette->SetupAttachment(GetRootComponent());
    Silhouette->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Silhouette->SetRelativeScale3D(FVector(0.55f, 0.55f, 1.5f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> ProxyMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    Silhouette->SetStaticMesh(ProxyMesh.Object);
}

void AThreeBCharacter::BeginPlay()
{
    Super::BeginPlay();
    ApplySprintState();

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
    ApplySprintState();
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

    // A fresh checkout is playable without missing binary Enhanced Input assets.
    if (!DefaultMappingContext)
    {
        PlayerInputComponent->BindAxisKey(EKeys::MouseX, this, &AThreeBCharacter::FallbackLookHorizontal);
        PlayerInputComponent->BindAxisKey(EKeys::MouseY, this, &AThreeBCharacter::FallbackLookVertical);
        PlayerInputComponent->BindKey(EKeys::SpaceBar, IE_Pressed, this, &ACharacter::Jump);
        PlayerInputComponent->BindKey(EKeys::SpaceBar, IE_Released, this, &ACharacter::StopJumping);
        PlayerInputComponent->BindKey(EKeys::LeftShift, IE_Pressed, this, &AThreeBCharacter::StartSprint);
        PlayerInputComponent->BindKey(EKeys::LeftShift, IE_Released, this, &AThreeBCharacter::StopSprint);
        PlayerInputComponent->BindKey(EKeys::E, IE_Pressed, this, &AThreeBCharacter::RequestInteraction);
        return;
    }

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
    if (SprintAction)
    {
        Enhanced->BindAction(SprintAction, ETriggerEvent::Started, this, &AThreeBCharacter::StartSprint);
        Enhanced->BindAction(SprintAction, ETriggerEvent::Completed, this, &AThreeBCharacter::StopSprint);
        Enhanced->BindAction(SprintAction, ETriggerEvent::Canceled, this, &AThreeBCharacter::StopSprint);
    }
    if (InteractAction)
    {
        Enhanced->BindAction(InteractAction, ETriggerEvent::Started, this, &AThreeBCharacter::RequestInteraction);
    }
}

void AThreeBCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    APlayerController* PC = Cast<APlayerController>(Controller);
    if (PC && PC->IsLocalController() && !DefaultMappingContext)
    {
        const float Forward = (PC->IsInputKeyDown(EKeys::W) || PC->IsInputKeyDown(EKeys::Z) || PC->IsInputKeyDown(EKeys::Up) ? 1.f : 0.f)
            - (PC->IsInputKeyDown(EKeys::S) || PC->IsInputKeyDown(EKeys::Down) ? 1.f : 0.f);
        const float Right = (PC->IsInputKeyDown(EKeys::D) || PC->IsInputKeyDown(EKeys::Right) ? 1.f : 0.f)
            - (PC->IsInputKeyDown(EKeys::A) || PC->IsInputKeyDown(EKeys::Q) || PC->IsInputKeyDown(EKeys::Left) ? 1.f : 0.f);
        Move(FInputActionValue(FVector2D(Right, Forward).GetClampedToMaxSize(1.f)));
    }
    if (HasAuthority() && GetActorLocation().Z < -10000.f)
    {
        if (AActor* Start = UGameplayStatics::GetActorOfClass(this, APlayerStart::StaticClass()))
        {
            SetActorLocation(Start->GetActorLocation(), false, nullptr, ETeleportType::TeleportPhysics);
            GetCharacterMovement()->StopMovementImmediately();
        }
    }
}

void AThreeBCharacter::FallbackLookHorizontal(float Value) { AddControllerYawInput(Value); }
void AThreeBCharacter::FallbackLookVertical(float Value) { AddControllerPitchInput(-Value); }

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

void AThreeBCharacter::StartSprint()
{
    SetSprintRequested(true);
}

void AThreeBCharacter::StopSprint()
{
    SetSprintRequested(false);
}

void AThreeBCharacter::RequestInteraction()
{
    if (InteractionComponent)
    {
        InteractionComponent->RequestInteract();
    }
}

void AThreeBCharacter::SetSprintRequested(bool bRequested)
{
    bSprintRequested = bRequested;
    ApplySprintState();

    if (!HasAuthority())
    {
        ServerSetSprintRequested(bRequested);
    }
}

void AThreeBCharacter::ServerSetSprintRequested_Implementation(bool bRequested)
{
    bSprintRequested = bRequested;
    ApplySprintState();
}

void AThreeBCharacter::ApplySprintState()
{
    UCharacterMovementComponent* Movement = GetCharacterMovement();
    if (!Movement)
    {
        return;
    }

    const float SafeWalkSpeed = FMath::Clamp(WalkSpeed, 150.0f, 650.0f);
    const float SafeSprintSpeed = FMath::Clamp(SprintSpeed, SafeWalkSpeed, 850.0f);
    Movement->MaxWalkSpeed = bSprintRequested ? SafeSprintSpeed : SafeWalkSpeed;
}
