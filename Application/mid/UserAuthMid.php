<?php

namespace ctCloud\app\mid;

use Slim\Http\Request;
use Slim\Http\Response;

class UserAuthMid
{
    public function __invoke(Request $req, Response $rsp, callable $next)
    {
        $cookie = $req->getHeader('Cookie');
        $redirect2Login = false;
        if (empty($cookie)) {
            $redirect2Login = true;
        }
        session_start();
        if (!array_key_exists('user', $_SESSION) || $_SESSION['user'] === null) {
            session_destroy();
            session_register_shutdown();
            session_write_close();
            $redirect2Login = true;
        }
        $GLOBALS['session'] = $_SESSION;
        session_write_close();
        if ($redirect2Login) {
            return $rsp->withRedirect('/user/login');
        }
        return $next($req, $rsp);
    }
}