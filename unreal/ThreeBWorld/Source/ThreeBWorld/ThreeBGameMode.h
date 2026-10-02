#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "ThreeBGameMode.generated.h"

UCLASS()
class THREEBWORLD_API AThreeBGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AThreeBGameMode();
    virtual void Tick(float DeltaSeconds) override;
private:
    float SmokeElapsed = 0.f;
    int32 SmokeStage = 0;
    FVector SmokeStart = FVector::ZeroVector;
};
