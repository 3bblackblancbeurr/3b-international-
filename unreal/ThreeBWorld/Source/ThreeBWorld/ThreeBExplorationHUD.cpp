#include "ThreeBExplorationHUD.h"
#include "ThreeBExplorationPortal.h"
#include "Engine/Canvas.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

void AThreeBExplorationHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas) return;
    const bool bFrance = UGameplayStatics::GetCurrentLevelName(this).Contains(TEXT("France"));
    DrawRect(FLinearColor(0.015f, 0.025f, 0.045f, 0.85f), 20, 20, 620, 120);
    DrawText(bFrance ? TEXT("MONDE DU 3B | FRANCE - JUSTICE") : TEXT("MONDE DU 3B | CITE DES HUIT HERITAGES"), FColor(255, 217, 135), 38, 33, nullptr, 1.35f);
    DrawText(TEXT("Exploration native - geometrie et personnage de prototype"), FColor::White, 38, 62);
    DrawText(TEXT("ZQSD / WASD : marcher  |  Souris : regarder  |  Maj : courir"), FColor::White, 38, 83);
    DrawText(TEXT("E : porte proche  |  Espace : sauter  |  Alt+F4 : quitter"), FColor::White, 38, 105);
    APawn* Pawn = GetOwningPlayerController() ? GetOwningPlayerController()->GetPawn() : nullptr;
    if (!Pawn) return;
    AThreeBExplorationPortal* Nearest = nullptr;
    float Distance = TNumericLimits<float>::Max();
    for (TActorIterator<AThreeBExplorationPortal> It(GetWorld()); It; ++It)
    {
        const float Candidate = FVector::Dist(Pawn->GetActorLocation(), It->GetActorLocation());
        if (Candidate < Distance) { Nearest = *It; Distance = Candidate; }
    }
    if (Nearest)
    {
        DrawText(FString::Printf(TEXT("%s  |  %.0f m"), *Nearest->PortalLabel, Distance / 100.f), FColor(255, 217, 135), 38, 157);
        FVector2D Screen;
        if (GetOwningPlayerController()->ProjectWorldLocationToScreen(Nearest->GetActorLocation() + FVector(0,0,220), Screen)
            && Screen.X > 0 && Screen.X < Canvas->SizeX && Screen.Y > 190 && Screen.Y < Canvas->SizeY)
            DrawText(TEXT("PORTE"), FColor(255, 217, 135), Screen.X, Screen.Y);
    }
    DrawLine(Canvas->SizeX * .5f - 5, Canvas->SizeY * .5f, Canvas->SizeX * .5f + 5, Canvas->SizeY * .5f, FLinearColor::White);
    DrawLine(Canvas->SizeX * .5f, Canvas->SizeY * .5f - 5, Canvas->SizeX * .5f, Canvas->SizeY * .5f + 5, FLinearColor::White);
}
