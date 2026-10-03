#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "ThreeBExplorationHUD.generated.h"

UCLASS()
class THREEBWORLD_API AThreeBExplorationHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
};
