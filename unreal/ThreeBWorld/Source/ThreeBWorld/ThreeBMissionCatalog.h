#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "ThreeBMissionCatalog.generated.h"

UENUM(BlueprintType)
enum class EThreeBMissionAuthority : uint8
{
    PresentationOnly UMETA(DisplayName="Presentation Only"),
    ServerVerified UMETA(DisplayName="Server Verified")
};

USTRUCT(BlueprintType)
struct FThreeBMissionObjectiveDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTagContainer GameplayTags;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bOptional = false;
};

USTRUCT(BlueprintType)
struct FThreeBMissionDefinitionEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName DistrictId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> AvailablePhaseIds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTagContainer RequiredWorldStateTags;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FThreeBMissionObjectiveDefinition> Objectives;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName RewardPolicyKey;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    EThreeBMissionAuthority Authority = EThreeBMissionAuthority::ServerVerified;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> ConsequenceKeys;
};

UCLASS(BlueprintType)
class THREEBWORLD_API UThreeBMissionCatalog : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Mission")
    FName CatalogId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Mission")
    int32 SchemaVersion = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Mission")
    TArray<FThreeBMissionDefinitionEntry> Missions;

    UFUNCTION(BlueprintPure, Category="3B|Mission")
    bool FindMission(FName Id, FThreeBMissionDefinitionEntry& OutMission) const;

    UFUNCTION(BlueprintPure, Category="3B|Mission")
    bool ValidateCatalog(TArray<FString>& OutErrors) const;
};
