#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "ThreeBPopulationDefinition.generated.h"

USTRUCT(BlueprintType)
struct FThreeBPopulationSimulationTier
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="0.0"))
    float MaxDistanceCm = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Mode;
};

USTRUCT(BlueprintType)
struct FThreeBPopulationRoutineProfile
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Morning;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Day;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Evening;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Night;
};

USTRUCT(BlueprintType)
struct FThreeBPopulationArchetype
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName DistrictId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(ClampMin="0"))
    int32 TargetPopulation = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> Roles;
};

USTRUCT(BlueprintType)
struct FThreeBNpcRoleDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName ZoneId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName DistrictId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName RoutineId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> ActivePhaseIds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> MemoryFactKeys;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> Intents;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName PostLiberationBehavior;
};

UCLASS(BlueprintType)
class THREEBWORLD_API UThreeBPopulationDefinition : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Population")
    FName PopulationId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Population", meta=(ClampMin="0"))
    int32 ActiveAiControllerBudget = 48;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Population")
    TArray<FThreeBPopulationSimulationTier> SimulationTiers;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Population")
    TArray<FThreeBPopulationRoutineProfile> RoutineProfiles;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Population")
    TArray<FThreeBPopulationArchetype> Archetypes;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Population")
    TArray<FThreeBNpcRoleDefinition> NpcRoles;

    UFUNCTION(BlueprintPure, Category="3B|Population")
    bool FindRoutine(FName Id, FThreeBPopulationRoutineProfile& OutRoutine) const;

    UFUNCTION(BlueprintPure, Category="3B|Population")
    bool FindNpcRole(FName Id, FThreeBNpcRoleDefinition& OutRole) const;

    UFUNCTION(BlueprintPure, Category="3B|Population")
    bool ValidateDefinition(TArray<FString>& OutErrors) const;
};
