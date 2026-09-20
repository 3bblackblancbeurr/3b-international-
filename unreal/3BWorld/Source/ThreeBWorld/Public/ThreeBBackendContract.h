#pragma once

#include "CoreMinimal.h"

namespace ThreeBBackend
{
    // Never embed private keys or service_role credentials in the Unreal client.
    static constexpr const TCHAR* WorldEnginePath = TEXT("/functions/v1/world-engine");
    static constexpr const TCHAR* City3BPath = TEXT("/functions/v1/city-3b");
    static constexpr const TCHAR* MemberHubPath = TEXT("/functions/v1/member-hub");

    static constexpr const TCHAR* HeaderAuthorization = TEXT("Authorization");
    static constexpr const TCHAR* HeaderApiKey = TEXT("apikey");
    static constexpr const TCHAR* HeaderContentType = TEXT("Content-Type");
    static constexpr const TCHAR* JsonContentType = TEXT("application/json");
}
