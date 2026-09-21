#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ThreeBMissionCatalog.h"
#include "ThreeBMissionSubsystem.generated.h"

UCLASS()
class THREEBWORLD_API UThreeBMissionSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="3B|Mission")
    void SetMissionCatalog(UThreeBMissionCatalog* InCatalog);

    UFUNCTION(BlueprintPure, Category="3B|Mission")
    UThreeBMissionCatalog* GetMissionCatalog() const { return MissionCatalog; }

    UFUNCTION(BlueprintPure, Category="3B|Mission")
    bool IsMissionAvailable(
        FName MissionId,
        FName CurrentPhaseId,
        FName CurrentWorldStateId
    ) const;

    UFUNCTION(BlueprintPure, Category="3B|Mission")
    TArray<FName> GetAvailableMissionIds(
        FName CurrentPhaseId,
        FName CurrentWorldStateId
    ) const;

private:
    UPROPERTY(Transient)
    TObjectPtr<UThreeBMissionCatalog> MissionCatalog;
};
