#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "ThreeBWorldDefinition.generated.h"

USTRUCT(BlueprintType)
struct FThreeBTerritoryDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Id;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText GuardianName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FText ValueName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTag CountryTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FGameplayTag ResonanceTag;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftObjectPtr<UWorld> EntryWorld;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, meta=(MultiLine=true))
    FText CreativeRule;
};

UCLASS(BlueprintType)
class THREEBWORLD_API UThreeBWorldDefinition : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="3B|World")
    TArray<FThreeBTerritoryDefinition> Territories;

    UFUNCTION(BlueprintPure, Category="3B|World")
    bool FindTerritory(FName Id, FThreeBTerritoryDefinition& OutTerritory) const;
};
