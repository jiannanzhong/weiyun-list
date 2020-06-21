<?php

namespace ctCloud\app\exception;


class InternalError extends ApiException
{
    public function __construct($msg)
    {
        parent::__construct(2001, $msg);
    }
}