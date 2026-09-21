#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "ThreeBStorySliceDefinition.generated.h"

UENUM(BlueprintType)
enum class EThreeBStoryAuthority : uint8
{
    PresentationOnly UMETA(DisplayName="Présentation locale uniquement"),
    ServerVerified UMETA(DisplayName="Validation serveur obligatoire")
};

USTRUCT(BlueprintType)
struct FThreeBStoryEvidenceDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTag CategoryTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    EThreeBStoryAuthority Authority = EThreeBStoryAuthority::ServerVerified;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName ServerFactKey;
};

USTRUCT(BlueprintType)
struct FThreeBStoryPhaseDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTag PhaseTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> RequiredPhaseIds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FName> RequiredEvidenceIds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTagContainer RequiredAbilityTags;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    EThreeBStoryAuthority Authority = EThreeBStoryAuthority::ServerVerified;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName ServerEvent;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName DataLayerState;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(MultiLine=true))
    FText PlayerGoal;
};

USTRUCT(BlueprintType)
struct FThreeBStoryOutcomeDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTag OutcomeTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName RequiredPhaseId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName ServerEvent;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName DataLayerState;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bPersistent = true;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    bool bCanGrantGlobalReward = false;
};

UCLASS(BlueprintType)
class THREEBWORLD_API UThreeBStorySliceDefinition : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    FName SliceId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    int32 SchemaVersion = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    FGameplayTag TerritoryTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    FGameplayTag ResonanceTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    TArray<FThreeBStoryEvidenceDefinition> Evidence;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    TArray<FThreeBStoryPhaseDefinition> Phases;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|Story")
    TArray<FThreeBStoryOutcomeDefinition> Outcomes;

    UFUNCTION(BlueprintPure, Category="3B|Story")
    bool FindPhase(FName Id, FThreeBStoryPhaseDefinition& OutPhase) const;

    UFUNCTION(BlueprintPure, Category="3B|Story")
    bool FindEvidence(FName Id, FThreeBStoryEvidenceDefinition& OutEvidence) const;
};
