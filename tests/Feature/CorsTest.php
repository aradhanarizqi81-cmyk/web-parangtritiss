<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    public function test_preflight_from_allowed_origin_is_permitted(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type, authorization',
        ])->options('/api/v1/auth/login');

        $response->assertNoContent();
        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        $response->assertHeader('Access-Control-Allow-Methods');
        $this->assertStringContainsStringIgnoringCase('POST', $response->headers->get('Access-Control-Allow-Methods'));
        $this->assertStringContainsStringIgnoringCase('authorization', $response->headers->get('Access-Control-Allow-Headers'));
    }

    public function test_preflight_from_disallowed_origin_is_rejected(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://evil.example',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/v1/auth/login');

        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_allowed_origin_is_echoed_on_actual_request(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'secret',
        ]);

        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    }
}
