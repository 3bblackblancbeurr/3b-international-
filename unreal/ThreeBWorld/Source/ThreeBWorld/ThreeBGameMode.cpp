#include "ThreeBGameMode.h"

#include "ThreeBCharacter.h"
#include "ThreeBGameState.h"
#include "ThreeBPlayerState.h"
#include "ThreeBExplorationHUD.h"
#include "ThreeBExplorationPortal.h"
#include "ThreeBInteractionComponent.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "Kismet/GameplayStatics.h"
#include "UnrealClient.h"

AThreeBGameMode::AThreeBGameMode()
{
    DefaultPawnClass = AThreeBCharacter::StaticClass();
    PlayerStateClass = AThreeBPlayerState::StaticClass();
    GameStateClass = AThreeBGameState::StaticClass();
    HUDClass = AThreeBExplorationHUD::StaticClass();
#if WITH_DEV_AUTOMATION_TESTS
    PrimaryActorTick.bCanEverTick = FParse::Param(FCommandLine::Get(), TEXT("ThreeBExplorationSmoke"));
#endif
}

void AThreeBGameMode::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
#if WITH_DEV_AUTOMATION_TESTS
    // Opt-in real game-world smoke test. Exercises spawn, movement and both travel directions.
    if (!FParse::Param(FCommandLine::Get(), TEXT("ThreeBExplorationSmoke"))) return;
    static int32 TravelLeg = 0;
    SmokeElapsed += DeltaSeconds;
    const auto Finish = [](bool bPassed, const FString& Reason)
    {
        const FString Directory = FPaths::ProjectSavedDir() / TEXT("Validation");
        IFileManager::Get().MakeDirectory(*Directory, true);
        FFileHelper::SaveStringToFile(FString::Printf(TEXT("{\"status\":\"%s\",\"reason\":\"%s\",\"test\":\"spawn_move_interact_hub_france_hub\"}"), bPassed ? TEXT("PASS") : TEXT("FAIL"), *Reason), *(Directory / TEXT("native-exploration-runtime.json")));
        UE_LOG(LogTemp, Display, TEXT("3B_NATIVE_EXPLORATION_RUNTIME_%s: %s"), bPassed ? TEXT("PASS") : TEXT("FAIL"), *Reason);
        FPlatformMisc::RequestExitWithStatus(false, bPassed ? 0 : 1);
    };
    if (SmokeElapsed > 35.f) { Finish(false, TEXT("Timed out waiting for spawn, movement or travel")); return; }
    APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
    AThreeBCharacter* Pawn = PC ? Cast<AThreeBCharacter>(PC->GetPawn()) : nullptr;
    if (!Pawn || SmokeElapsed < 3.f) return;
    const bool bFrance = UGameplayStatics::GetCurrentLevelName(this).Contains(TEXT("France"));
    if ((TravelLeg == 1) != bFrance) { Finish(false, TEXT("Unexpected map in travel sequence")); return; }
    if (TravelLeg == 2) { Finish(true, TEXT("Native pawn moved and interacted through Hub to France and back")); return; }
    if (SmokeStage == 0)
    {
        SmokeStart = Pawn->GetActorLocation();
        SmokeStage = 1;
        if (FParse::Param(FCommandLine::Get(), TEXT("ThreeBExplorationCapture")))
        {
            FScreenshotRequest::RequestScreenshot(FPaths::ProjectSavedDir() / TEXT("Screenshots") /
                (bFrance ? TEXT("native-france.png") : TEXT("native-nexus.png")), false, false);
        }
    }
    if (SmokeElapsed < 4.f) { Pawn->AddMovementInput(FVector::ForwardVector, 1.f); return; }
    if (SmokeStage == 1)
    {
        if (FVector::Dist2D(SmokeStart, Pawn->GetActorLocation()) < 100.f) { Finish(false, TEXT("Native movement did not move 100 cm")); return; }
        AThreeBExplorationPortal* Nearest = nullptr;
        float Distance = TNumericLimits<float>::Max();
        for (TActorIterator<AThreeBExplorationPortal> It(GetWorld()); It; ++It)
        {
            const float Candidate = FVector::Dist(Pawn->GetActorLocation(), It->GetActorLocation());
            if (Candidate < Distance) { Nearest = *It; Distance = Candidate; }
        }
        if (!Nearest || !Nearest->CanInteract_Implementation(Pawn)) { Finish(false, TEXT("Portal missing or destination unavailable")); return; }
        Pawn->SetActorLocation(Nearest->GetActorLocation() - FVector(220, 0, 0), false, nullptr, ETeleportType::TeleportPhysics);
        PC->SetControlRotation(FRotator::ZeroRotator);
        SmokeStage = 2;
        return;
    }
    if (SmokeStage == 2 && SmokeElapsed > 5.f)
    {
        UThreeBInteractionComponent* Interaction = Pawn->FindComponentByClass<UThreeBInteractionComponent>();
        if (!Interaction || !Interaction->FindFocusedActor()) { Finish(false, TEXT("Camera interaction ray did not find portal")); return; }
        ++TravelLeg;
        SmokeStage = 3;
        Interaction->RequestInteract();
    }
#endif
}
