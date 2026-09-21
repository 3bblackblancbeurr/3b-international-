#include "ThreeBWorldDefinition.h"

bool UThreeBWorldDefinition::FindTerritory(FName Id, FThreeBTerritoryDefinition& OutTerritory) const
{
    for (const FThreeBTerritoryDefinition& Territory : Territories)
    {
        if (Territory.Id == Id)
        {
            OutTerritory = Territory;
            return true;
        }
    }

    return false;
}
