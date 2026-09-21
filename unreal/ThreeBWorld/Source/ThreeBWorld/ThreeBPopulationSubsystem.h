#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "ThreeBPopulationDefinition.h"
#include "ThreeBPopulationSubsystem.generated.h"

UENUM(BlueprintType)
enum class EThreeBDayPeriod : uint8
{
    Morning,
    Day,
    Evening,
    Night
};

UCLASS()
class THREEBWORLD_API UThreeBPopulationSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="3B|Population")
    void SetPopulationDefinition(UThreeBPopulationDefinition* InDefinition);

    UFUNCTION(BlueprintPure, Category="3B|Population")
    UThreeBPopulationDefinition* GetPopulationDefinition() const { return PopulationDefinition; }

    UFUNCTION(BlueprintPure, Category="3B|Population")
    bool ResolveSimulationTier(
        float DistanceCm,
        FName& OutTierId,
        FName& OutMode
    ) const;

    UFUNCTION(BlueprintPure, Category="3B|Population")
    bool ResolveRoutineActivity(
        FName RoutineId,
        EThreeBDayPeriod Period,
        FName& OutActivity
    ) const;

    UFUNCTION(BlueprintPure, Category="3B|Population")
    bool CanActivateFullAi(int32 CurrentActiveControllers) const;

private:
    UPROPERTY(Transient)
    TObjectPtr<UThreeBPopulationDefinition> PopulationDefinition;
};
