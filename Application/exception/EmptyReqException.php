<?php

namespace ctCloud\app\exception;


class EmptyReqException extends InvalidReqException
{
    public function __construct()
    {
        parent::__construct('request is empty');
    }
}